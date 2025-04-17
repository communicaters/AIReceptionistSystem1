import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bell, 
  CalendarClock, 
  CheckCircle2, 
  HelpCircle, 
  MessageSquare, 
  Package, 
  RefreshCw, 
  Settings, 
  User, 
  UserCheck, 
  Users, 
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  BarChart4
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";

// Define types for the admin dashboard data
interface SystemStatus {
  id: number;
  name: string;
  status: string;
  lastCheck: string;
  version: string;
  message?: string;
}

interface SystemActivity {
  id: number;
  module: string;
  event: string;
  timestamp: string;
  details: string;
  level: "info" | "warning" | "error" | "success";
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  usersTrend: number;
}

interface PackageStats {
  totalPackages: number;
  activePackages: number;
  mostPopularPackage: string;
  packagesTrend: number;
}

interface UsageStats {
  totalConversations: number;
  totalMessages: number;
  avgResponseTime: number;
  usageTrend: number;
}

interface UserSummary {
  id: number;
  username: string;
  fullName: string;
  email: string;
  status: string;
  lastLogin: string;
}

// Fetch admin dashboard summary data
const fetchDashboardSummary = async () => {
  const response = await fetch("/api/admin/dashboard");
  if (!response.ok) {
    throw new Error("Failed to fetch dashboard data");
  }
  return response.json();
};

// Fetch system status
const fetchSystemStatus = async () => {
  const response = await fetch("/api/system/status");
  if (!response.ok) {
    throw new Error("Failed to fetch system status");
  }
  return response.json();
};

// Fetch recent system activity
const fetchSystemActivity = async () => {
  const response = await fetch("/api/system/activity");
  if (!response.ok) {
    throw new Error("Failed to fetch system activity");
  }
  return response.json();
};

// Format date
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return format(date, "MMM dd, yyyy HH:mm");
  } catch (error) {
    return dateString;
  }
};

// Admin Dashboard Component
export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch dashboard summary data
  const { 
    data: dashboardData,
    isLoading: isLoadingDashboard,
    error: dashboardError
  } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    queryFn: fetchDashboardSummary,
    refetchInterval: 300000, // 5 minutes
  });
  
  // Fetch system status
  const { 
    data: systemStatus = [],
    isLoading: isLoadingStatus,
    error: statusError
  } = useQuery({
    queryKey: ['/api/system/status'],
    queryFn: fetchSystemStatus,
    refetchInterval: 60000, // 1 minute
  });
  
  // Fetch system activity
  const { 
    data: systemActivity = [],
    isLoading: isLoadingActivity,
    error: activityError
  } = useQuery({
    queryKey: ['/api/system/activity'],
    queryFn: fetchSystemActivity,
    refetchInterval: 60000, // 1 minute
  });
  
  // Show error if any query fails
  useEffect(() => {
    if (dashboardError || statusError || activityError) {
      toast({
        title: "Error loading dashboard data",
        description: "There was a problem loading the dashboard. Please try again.",
        variant: "destructive",
      });
    }
  }, [dashboardError, statusError, activityError, toast]);
  
  const isLoading = isLoadingDashboard || isLoadingStatus || isLoadingActivity;
  
  // Get status counts
  const getStatusCounts = () => {
    const counts = {
      ok: 0,
      warning: 0,
      error: 0,
      inactive: 0,
    };
    
    systemStatus.forEach((status: SystemStatus) => {
      if (status.status === "active") counts.ok++;
      else if (status.status === "warning") counts.warning++;
      else if (status.status === "error") counts.error++;
      else if (status.status === "inactive") counts.inactive++;
    });
    
    return counts;
  };
  
  const statusCounts = getStatusCounts();
  
  // Get a short timeframe description
  const getTimeframeDescription = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 5) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };
  
  return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System overview and management
          </p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dashboardData?.userStats && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">User Management</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.userStats.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      Total registered users
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm">
                        <span className="font-medium">{dashboardData.userStats.activeUsers}</span> active users
                      </div>
                      <div className="flex items-center">
                        {dashboardData.userStats.usersTrend > 0 ? (
                          <div className="text-green-500 flex items-center text-xs">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            <span>{Math.abs(dashboardData.userStats.usersTrend)}%</span>
                          </div>
                        ) : (
                          <div className="text-red-500 flex items-center text-xs">
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                            <span>{Math.abs(dashboardData.userStats.usersTrend)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setLocation('/admin/users')}>
                      Manage Users
                    </Button>
                  </CardFooter>
                </Card>
              )}
              
              {dashboardData?.packageStats && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Package Management</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.packageStats.totalPackages}</div>
                    <p className="text-xs text-muted-foreground">
                      Total subscription packages
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm">
                        <span className="font-medium">{dashboardData.packageStats.activePackages}</span> active packages
                      </div>
                      <div className="flex items-center">
                        {dashboardData.packageStats.packagesTrend > 0 ? (
                          <div className="text-green-500 flex items-center text-xs">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            <span>{Math.abs(dashboardData.packageStats.packagesTrend)}%</span>
                          </div>
                        ) : (
                          <div className="text-red-500 flex items-center text-xs">
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                            <span>{Math.abs(dashboardData.packageStats.packagesTrend)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setLocation('/admin/packages')}>
                      Manage Packages
                    </Button>
                  </CardFooter>
                </Card>
              )}
              
              {dashboardData?.usageStats && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">System Usage</CardTitle>
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.usageStats.totalConversations}</div>
                    <p className="text-xs text-muted-foreground">
                      Total conversations
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="font-medium">{dashboardData.usageStats.avgResponseTime}s</span> avg. response
                      </div>
                      <div className="flex items-center">
                        {dashboardData.usageStats.usageTrend > 0 ? (
                          <div className="text-green-500 flex items-center text-xs">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            <span>{Math.abs(dashboardData.usageStats.usageTrend)}%</span>
                          </div>
                        ) : (
                          <div className="text-red-500 flex items-center text-xs">
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                            <span>{Math.abs(dashboardData.usageStats.usageTrend)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setLocation('/admin/reports')}>
                      View Reports
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
            
            {/* System Status Section */}
            <Tabs defaultValue="status" className="space-y-4">
              <TabsList>
                <TabsTrigger value="status" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  System Status
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Recent Activity
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Recent Users
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="status" className="space-y-4">
                {/* Status Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">Active</div>
                      <Badge variant="default" className="bg-green-600">
                        {statusCounts.ok}
                      </Badge>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">Warning</div>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        {statusCounts.warning}
                      </Badge>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">Error</div>
                      <Badge variant="destructive">
                        {statusCounts.error}
                      </Badge>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">Inactive</div>
                      <Badge variant="outline">
                        {statusCounts.inactive}
                      </Badge>
                    </div>
                  </Card>
                </div>
                
                {/* Status Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Module Status</CardTitle>
                    <CardDescription>
                      Current status of all system modules
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {systemStatus.map((status: SystemStatus) => (
                          <Card key={status.id} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{status.name}</div>
                              {status.status === "active" && (
                                <Badge variant="default" className="bg-green-600">Active</Badge>
                              )}
                              {status.status === "warning" && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Warning</Badge>
                              )}
                              {status.status === "error" && (
                                <Badge variant="destructive">Error</Badge>
                              )}
                              {status.status === "inactive" && (
                                <Badge variant="outline">Inactive</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mb-3">
                              Version {status.version} • Last checked {formatDate(status.lastCheck)}
                            </div>
                            {status.message && (
                              <div className="text-sm mt-2 p-2 rounded-md bg-muted">
                                {status.message}
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>System Activity</CardTitle>
                    <CardDescription>
                      Recent system events and notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {systemActivity.map((activity: SystemActivity) => (
                          <Card key={activity.id} className="p-4">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium">{activity.module}</div>
                                {activity.level === "info" && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    Info
                                  </Badge>
                                )}
                                {activity.level === "warning" && (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    Warning
                                  </Badge>
                                )}
                                {activity.level === "error" && (
                                  <Badge variant="destructive">
                                    Error
                                  </Badge>
                                )}
                                {activity.level === "success" && (
                                  <Badge variant="default" className="bg-green-600">
                                    Success
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getTimeframeDescription(activity.timestamp)}
                              </div>
                            </div>
                            <div className="font-medium text-sm">
                              {activity.event}
                            </div>
                            <div className="text-sm mt-2 p-2 rounded-md bg-muted">
                              {activity.details}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="users" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent User Activity</CardTitle>
                    <CardDescription>
                      Recently active users and their status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboardData?.recentUsers ? (
                      <div className="border rounded-md">
                        <div className="grid grid-cols-5 gap-4 p-3 border-b bg-muted/50">
                          <div className="text-sm font-medium">User</div>
                          <div className="text-sm font-medium">Email</div>
                          <div className="text-sm font-medium">Status</div>
                          <div className="text-sm font-medium">Last Login</div>
                          <div className="text-sm font-medium">Actions</div>
                        </div>
                        {dashboardData.recentUsers.map((user: UserSummary) => (
                          <div key={user.id} className="grid grid-cols-5 gap-4 p-3 border-b items-center">
                            <div>
                              <div className="font-medium">{user.fullName}</div>
                              <div className="text-xs text-muted-foreground">@{user.username}</div>
                            </div>
                            <div className="text-sm">{user.email}</div>
                            <div>
                              {user.status === 'active' ? (
                                <Badge variant="default" className="bg-green-600">Active</Badge>
                              ) : user.status === 'inactive' ? (
                                <Badge variant="secondary">Inactive</Badge>
                              ) : (
                                <Badge variant="destructive">Suspended</Badge>
                              )}
                            </div>
                            <div className="text-sm">{formatDate(user.lastLogin)}</div>
                            <div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setLocation(`/admin/users/${user.id}/packages`)}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 border rounded-md">
                        <User className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Recent Users</h3>
                        <p className="text-muted-foreground text-center mb-6">
                          There is no recent user activity to display.
                        </p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={() => setLocation('/admin/users')}>
                      View All Users
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
            
            {/* Admin Action Cards */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Analytics & Reports</CardTitle>
                    <BarChart4 className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground">
                    Access system analytics, usage reports, and performance metrics
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="default" className="w-full" onClick={() => setLocation('/admin/reports')}>
                    View Reports
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Support Management</CardTitle>
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground">
                    Manage support tickets and user assistance requests
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => setLocation('/admin/support')}>
                    Support Tickets
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">System Configuration</CardTitle>
                    <Settings className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground">
                    Configure system settings, backups, and global preferences
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => setLocation('/admin/settings')}>
                    System Settings
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </>
        )}
      </div>
  );
}