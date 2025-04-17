import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Download, 
  Filter, 
  BarChart4, 
  UsersRound, 
  PackageCheck, 
  BarChart, 
  PieChart, 
  RefreshCw,
  Calendar,
  CalendarCheck,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DashboardLayout from "@/components/layout/dashboard-layout";

// API functions for reports
const fetchUserActivityReport = async (
  startDate?: string,
  endDate?: string
): Promise<any> => {
  let url = '/api/reports/user-activity';
  const params = new URLSearchParams();
  
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch user activity report');
  }
  
  return response.json();
};

const fetchSubscriptionReport = async (
  startDate?: string,
  endDate?: string
): Promise<any> => {
  let url = '/api/reports/subscriptions';
  const params = new URLSearchParams();
  
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch subscription report');
  }
  
  return response.json();
};

// Reports page component
export default function ReportsManagement() {
  const [activeTab, setActiveTab] = useState("user-activity");
  const [timeframe, setTimeframe] = useState("last-30-days");
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  
  // Format dates for API calls
  const formattedStartDate = startDate ? format(startDate, 'yyyy-MM-dd') : undefined;
  const formattedEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : undefined;
  
  // User activity report query
  const { 
    data: userActivityData, 
    isLoading: isLoadingUserActivity 
  } = useQuery({
    queryKey: ['/api/reports/user-activity', formattedStartDate, formattedEndDate],
    queryFn: () => fetchUserActivityReport(formattedStartDate, formattedEndDate),
    enabled: activeTab === "user-activity",
  });
  
  // Subscription report query
  const { 
    data: subscriptionData, 
    isLoading: isLoadingSubscription 
  } = useQuery({
    queryKey: ['/api/reports/subscriptions', formattedStartDate, formattedEndDate],
    queryFn: () => fetchSubscriptionReport(formattedStartDate, formattedEndDate),
    enabled: activeTab === "subscriptions",
  });
  
  // Handle timeframe selection
  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
    
    const now = new Date();
    
    switch (value) {
      case "last-7-days":
        setStartDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        setEndDate(now);
        break;
      case "last-30-days":
        setStartDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        setEndDate(now);
        break;
      case "last-90-days":
        setStartDate(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));
        setEndDate(now);
        break;
      case "this-year":
        setStartDate(new Date(now.getFullYear(), 0, 1));
        setEndDate(now);
        break;
      case "custom":
        // Keep current selection for custom range
        break;
    }
  };
  
  // Format date range for display
  const formatDateRange = () => {
    if (!startDate || !endDate) return "Select a date range";
    return `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`;
  };
  
  return (
    <>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              View system metrics and usage statistics
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="timeframe" className="text-sm whitespace-nowrap">
              Time Period:
            </Label>
            <Select value={timeframe} onValueChange={handleTimeframeChange}>
              <SelectTrigger id="timeframe" className="w-[180px]">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {timeframe === "custom" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[240px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateRange()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={{
                      from: startDate || new Date(),
                      to: endDate || new Date(),
                    }}
                    onSelect={(range) => {
                      setStartDate(range?.from);
                      setEndDate(range?.to);
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          
          <Button variant="outline" className="ml-auto" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
        
        <Tabs 
          defaultValue="user-activity" 
          className="space-y-6"
          onValueChange={(value) => setActiveTab(value)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user-activity" className="flex items-center gap-2">
              <UsersRound className="h-4 w-4" />
              User Activity
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4" />
              Subscriptions
            </TabsTrigger>
          </TabsList>
          
          {/* User Activity Report */}
          <TabsContent value="user-activity">
            {isLoadingUserActivity ? (
              <div className="flex justify-center items-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : userActivityData ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <MetricCard 
                    title="Logins" 
                    value={userActivityData.totalLogins} 
                    trend={{
                      value: userActivityData.loginTrend,
                      isPositive: userActivityData.loginTrend > 0
                    }}
                    icon={<UsersRound className="h-5 w-5" />}
                  />
                  
                  <MetricCard 
                    title="Average Session" 
                    value={`${userActivityData.avgSessionTime} min`} 
                    trend={{
                      value: userActivityData.sessionTimeTrend,
                      isPositive: userActivityData.sessionTimeTrend > 0
                    }}
                    icon={<Clock className="h-5 w-5" />}
                  />
                  
                  <MetricCard 
                    title="Active Users" 
                    value={userActivityData.activeUsers} 
                    trend={{
                      value: userActivityData.activeUsersTrend,
                      isPositive: userActivityData.activeUsersTrend > 0
                    }}
                    icon={<Calendar className="h-5 w-5" />}
                  />
                  
                  <MetricCard 
                    title="Feature Usage" 
                    value={userActivityData.totalFeatureUsage} 
                    trend={{
                      value: userActivityData.featureUsageTrend,
                      isPositive: userActivityData.featureUsageTrend > 0
                    }}
                    icon={<BarChart className="h-5 w-5" />}
                  />
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">User Login Activity</CardTitle>
                      <CardDescription>
                        Daily logins over the selected period
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] flex flex-col justify-center items-center border rounded-md">
                        <BarChart4 className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Chart visualization would be displayed here</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Feature Usage Breakdown</CardTitle>
                      <CardDescription>
                        Most used features during this period
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] flex flex-col justify-center items-center border rounded-md">
                        <PieChart className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Chart visualization would be displayed here</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Recent User Activity</CardTitle>
                    <CardDescription>
                      Latest system activities from users
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Activity</TableHead>
                          <TableHead>Feature</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userActivityData.recentActivity && userActivityData.recentActivity.map((activity: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="font-medium">{activity.userName}</div>
                              <div className="text-xs text-muted-foreground">{activity.userEmail}</div>
                            </TableCell>
                            <TableCell>{activity.activityType}</TableCell>
                            <TableCell>{activity.feature}</TableCell>
                            <TableCell>{activity.timestamp}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={activity.status === "success" ? "default" : "destructive"}
                                className="capitalize"
                              >
                                {activity.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {(!userActivityData.recentActivity || userActivityData.recentActivity.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                              No activity data available for this period
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing recent activities in the selected period
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      View All
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <BarChart className="h-16 w-16 text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No Data Available</CardTitle>
                  <CardDescription className="text-center mb-6">
                    There is no user activity data available for the selected time period.
                  </CardDescription>
                  <Button onClick={() => handleTimeframeChange("last-30-days")}>
                    View Last 30 Days
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Subscriptions Report */}
          <TabsContent value="subscriptions">
            {isLoadingSubscription ? (
              <div className="flex justify-center items-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : subscriptionData ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <MetricCard 
                    title="Active Packages" 
                    value={subscriptionData.totalActivePackages} 
                    trend={{
                      value: subscriptionData.packagesTrend,
                      isPositive: subscriptionData.packagesTrend > 0
                    }}
                    icon={<PackageCheck className="h-5 w-5" />}
                  />
                  
                  <MetricCard 
                    title="Users w/ Package" 
                    value={subscriptionData.usersWithPackage} 
                    trend={{
                      value: subscriptionData.usersWithPackageTrend,
                      isPositive: subscriptionData.usersWithPackageTrend > 0
                    }}
                    icon={<UsersRound className="h-5 w-5" />}
                  />
                  
                  <MetricCard 
                    title="Feature Usage" 
                    value={subscriptionData.totalFeatureUsage} 
                    trend={{
                      value: subscriptionData.featureUsageTrend,
                      isPositive: subscriptionData.featureUsageTrend > 0
                    }}
                    icon={<BarChart className="h-5 w-5" />}
                  />
                  
                  <MetricCard 
                    title="Usage Rate" 
                    value={`${subscriptionData.usageRate}%`} 
                    trend={{
                      value: subscriptionData.usageRateTrend,
                      isPositive: subscriptionData.usageRateTrend > 0
                    }}
                    icon={<CalendarCheck className="h-5 w-5" />}
                  />
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Package Distribution</CardTitle>
                      <CardDescription>
                        User distribution across packages
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] flex flex-col justify-center items-center border rounded-md">
                        <PieChart className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Chart visualization would be displayed here</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Feature Usage by Package</CardTitle>
                      <CardDescription>
                        Most used features per package type
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] flex flex-col justify-center items-center border rounded-md">
                        <BarChart4 className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Chart visualization would be displayed here</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Package Usage</CardTitle>
                    <CardDescription>
                      Feature usage breakdown by package
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Package</TableHead>
                          <TableHead>Users</TableHead>
                          <TableHead>Features Used</TableHead>
                          <TableHead>Avg. Usage</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptionData.packageUsage && subscriptionData.packageUsage.map((pkg: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="font-medium">{pkg.name}</div>
                              <div className="text-xs text-muted-foreground">${pkg.price/100}/mo</div>
                            </TableCell>
                            <TableCell>{pkg.userCount}</TableCell>
                            <TableCell>{pkg.featuresUsed}</TableCell>
                            <TableCell>{pkg.avgUsage} per day</TableCell>
                            <TableCell>
                              <Badge 
                                variant={pkg.isActive ? "default" : "secondary"}
                                className="capitalize"
                              >
                                {pkg.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {(!subscriptionData.packageUsage || subscriptionData.packageUsage.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                              No package usage data available for this period
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing all packages in the selected period
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <PackageCheck className="h-16 w-16 text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No Subscription Data</CardTitle>
                  <CardDescription className="text-center mb-6">
                    There is no subscription data available for the selected time period.
                  </CardDescription>
                  <Button onClick={() => handleTimeframeChange("last-30-days")}>
                    View Last 30 Days
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  trend, 
  icon 
}: { 
  title: string; 
  value: string | number; 
  trend: { 
    value: number; 
    isPositive: boolean 
  };
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-5 w-5 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center pt-1 text-xs">
          {trend.isPositive ? (
            <div className="text-green-500 flex items-center">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>{Math.abs(trend.value)}% increase</span>
            </div>
          ) : (
            <div className="text-red-500 flex items-center">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              <span>{Math.abs(trend.value)}% decrease</span>
            </div>
          )}
          <span className="text-muted-foreground ml-1">from previous period</span>
        </div>
      </CardContent>
    </Card>
  );
}