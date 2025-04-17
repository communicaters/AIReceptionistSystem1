import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  UsersRound, 
  Package, 
  Calendar as CalendarIcon, 
  RefreshCw, 
  PackagePlus,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Info,
  AlertCircle,
  BarChart4
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/queryClient";

// Define types
interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
}

interface Package {
  id: number;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  features: PackageFeature[];
}

interface PackageFeature {
  id: number;
  featureKey: string;
  usageLimit: number | null;
  isEnabled: boolean;
}

interface UserPackage {
  id: number;
  userId: number;
  packageId: number;
  assignedAt: string;
  expiresAt: string | null;
  isActive: boolean;
  package: Package;
}

interface FeatureUsage {
  featureKey: string;
  usageCount: number;
  lastUsed: string;
}

// API functions
const fetchUser = async (userId: number): Promise<User> => {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user details');
  }
  const data = await response.json();
  return data.user;
};

const fetchUserPackages = async (userId: number): Promise<UserPackage[]> => {
  const response = await fetch(`/api/users/${userId}/packages`);
  if (!response.ok) {
    throw new Error('Failed to fetch user packages');
  }
  const data = await response.json();
  return data.userPackages;
};

const fetchAvailablePackages = async (): Promise<Package[]> => {
  const response = await fetch('/api/packages');
  if (!response.ok) {
    throw new Error('Failed to fetch available packages');
  }
  const data = await response.json();
  return data.packages.filter((pkg: Package) => pkg.isActive);
};

const fetchUserFeatureUsage = async (userId: number): Promise<FeatureUsage[]> => {
  const response = await fetch(`/api/users/${userId}/usage`);
  if (!response.ok) {
    throw new Error('Failed to fetch user feature usage');
  }
  const data = await response.json();
  return data.featureUsage;
};

const assignPackage = async ({ 
  userId, 
  packageId, 
  expiresAt 
}: { 
  userId: number; 
  packageId: number; 
  expiresAt: string | null;
}) => {
  const response = await apiRequest('POST', `/api/users/${userId}/packages`, {
    packageId,
    expiresAt,
    isActive: true
  });
  return response.json();
};

const deactivatePackage = async ({ 
  userId, 
  userPackageId 
}: { 
  userId: number; 
  userPackageId: number;
}) => {
  const response = await apiRequest('PATCH', `/api/users/${userId}/packages/${userPackageId}`, {
    isActive: false
  });
  return response.json();
};

// Validation schema
const assignPackageSchema = z.object({
  packageId: z.number({
    required_error: "Please select a package",
  }),
  expiresAt: z.date().nullable().optional(),
});

// User Package Management page component
export default function UserPackageManagement() {
  const [, setLocation] = useLocation();
  const [userId, setUserId] = useState<number | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Extract user ID from URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/admin\/users\/(\d+)\/packages/);
    if (match && match[1]) {
      setUserId(parseInt(match[1]));
    }
  }, []);
  
  // Fetch user details
  const { 
    data: user, 
    isLoading: isLoadingUser,
    error: userError
  } = useQuery({
    queryKey: [`/api/users/${userId}`],
    queryFn: () => fetchUser(userId as number),
    enabled: userId !== null,
  });
  
  // Fetch user packages
  const { 
    data: userPackages = [], 
    isLoading: isLoadingPackages,
    error: packagesError
  } = useQuery({
    queryKey: [`/api/users/${userId}/packages`],
    queryFn: () => fetchUserPackages(userId as number),
    enabled: userId !== null,
  });
  
  // Fetch available packages
  const { 
    data: availablePackages = [], 
    isLoading: isLoadingAvailable
  } = useQuery({
    queryKey: ['/api/packages'],
    queryFn: fetchAvailablePackages,
    enabled: showAssignDialog,
  });
  
  // Fetch user feature usage
  const { 
    data: featureUsage = [], 
    isLoading: isLoadingUsage
  } = useQuery({
    queryKey: [`/api/users/${userId}/usage`],
    queryFn: () => fetchUserFeatureUsage(userId as number),
    enabled: userId !== null,
  });
  
  // Assign package mutation
  const assignPackageMutation = useMutation({
    mutationFn: assignPackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/packages`] });
      toast({
        title: 'Package assigned',
        description: 'The package has been successfully assigned to the user.',
      });
      setShowAssignDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to assign package',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Deactivate package mutation
  const deactivatePackageMutation = useMutation({
    mutationFn: deactivatePackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/packages`] });
      toast({
        title: 'Package deactivated',
        description: 'The package has been successfully deactivated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to deactivate package',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };
  
  // Handle package deactivation
  const handleDeactivate = (packageId: number) => {
    if (window.confirm('Are you sure you want to deactivate this package?')) {
      deactivatePackageMutation.mutate({ 
        userId: userId as number, 
        userPackageId: packageId 
      });
    }
  };
  
  const isLoading = isLoadingUser || isLoadingPackages;
  const error = userError || packagesError;
  
  const activePackage = userPackages.find(pkg => pkg.isActive);
  
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation('/admin/users')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isLoading ? 'Loading...' : error ? 'User Not Found' : user?.fullName}
            </h1>
            {!isLoading && !error && (
              <p className="text-muted-foreground flex gap-1 items-center">
                <UsersRound className="h-3 w-3" />
                {user?.email} · {user?.role}
              </p>
            )}
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12">
              <AlertCircle className="h-16 w-16 text-destructive mb-4" />
              <CardTitle className="mb-2">Error Loading User</CardTitle>
              <CardDescription className="text-center mb-6">
                Could not load user details. The user may not exist or there was a server error.
              </CardDescription>
              <Button onClick={() => setLocation('/admin/users')}>
                Return to User Management
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="packages" className="space-y-6">
            <TabsList>
              <TabsTrigger value="packages" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Packages
              </TabsTrigger>
              <TabsTrigger value="usage" className="flex items-center gap-2">
                <BarChart4 className="h-4 w-4" />
                Usage
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="packages">
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Assigned Packages</CardTitle>
                      <CardDescription>
                        Manage this user's subscription packages and permissions
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowAssignDialog(true)}>
                      <PackagePlus className="mr-2 h-4 w-4" />
                      Assign Package
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {userPackages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 border rounded-md">
                      <Package className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Packages Assigned</h3>
                      <p className="text-muted-foreground text-center mb-6">
                        This user doesn't have any packages assigned yet.
                        Assign a package to grant access to features.
                      </p>
                      <Button onClick={() => setShowAssignDialog(true)}>
                        <PackagePlus className="mr-2 h-4 w-4" />
                        Assign Package
                      </Button>
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Package</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Assigned</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead>Features</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userPackages.map((userPackage) => (
                            <TableRow key={userPackage.id}>
                              <TableCell>
                                <div className="font-medium">{userPackage.package.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {userPackage.package.description || 'No description'}
                                </div>
                              </TableCell>
                              <TableCell>
                                {userPackage.isActive ? (
                                  <Badge className="bg-green-600">Active</Badge>
                                ) : (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                              </TableCell>
                              <TableCell>{formatDate(userPackage.assignedAt)}</TableCell>
                              <TableCell>
                                {userPackage.expiresAt 
                                  ? formatDate(userPackage.expiresAt)
                                  : 'No expiration'
                                }
                              </TableCell>
                              <TableCell>
                                {userPackage.package.features.length} features
                              </TableCell>
                              <TableCell className="text-right">
                                {userPackage.isActive ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeactivate(userPackage.id)}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled
                                  >
                                    <Info className="mr-2 h-4 w-4" />
                                    Inactive
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {activePackage && (
                <Card>
                  <CardHeader>
                    <CardTitle>Active Package Features</CardTitle>
                    <CardDescription>
                      Features available in the active package
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Feature</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Usage Limit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activePackage.package.features.map((feature) => (
                            <TableRow key={feature.id}>
                              <TableCell>
                                <div className="font-medium">{feature.featureKey}</div>
                              </TableCell>
                              <TableCell>
                                {feature.isEnabled ? (
                                  <div className="flex items-center text-green-600">
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Enabled
                                  </div>
                                ) : (
                                  <div className="flex items-center text-muted-foreground">
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Disabled
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {feature.usageLimit === null 
                                  ? 'Unlimited' 
                                  : `${feature.usageLimit} uses`
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="usage">
              <Card>
                <CardHeader>
                  <CardTitle>Feature Usage</CardTitle>
                  <CardDescription>
                    Track how this user uses the system features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingUsage ? (
                    <div className="flex justify-center items-center h-32">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : featureUsage.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 border rounded-md">
                      <BarChart4 className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Usage Data</h3>
                      <p className="text-muted-foreground text-center">
                        This user hasn't used any features yet.
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Feature</TableHead>
                            <TableHead>Usage Count</TableHead>
                            <TableHead>Last Used</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {featureUsage.map((usage, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="font-medium">{usage.featureKey}</div>
                              </TableCell>
                              <TableCell>{usage.usageCount} times</TableCell>
                              <TableCell>{formatDate(usage.lastUsed)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="ml-auto">
                    Download Report
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
      
      {/* Assign Package Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Package</DialogTitle>
            <DialogDescription>
              {user && `Assign a package to ${user.fullName}`}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingAvailable ? (
            <div className="flex justify-center items-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availablePackages.length === 0 ? (
            <div className="text-center p-4">
              <p className="mb-4">No active packages available.</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation('/admin/packages')}
              >
                Manage Packages
              </Button>
            </div>
          ) : (
            <AssignPackageForm 
              packages={availablePackages}
              onSubmit={(data) => {
                assignPackageMutation.mutate({
                  userId: userId as number,
                  packageId: data.packageId,
                  expiresAt: data.expiresAt ? format(data.expiresAt, 'yyyy-MM-dd') : null
                });
              }}
              isLoading={assignPackageMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// Package Assignment Form Component
function AssignPackageForm({ 
  packages, 
  onSubmit, 
  isLoading 
}: { 
  packages: Package[];
  onSubmit: (data: z.infer<typeof assignPackageSchema>) => void;
  isLoading: boolean;
}) {
  const [hasExpiration, setHasExpiration] = useState(false);
  
  const form = useForm<z.infer<typeof assignPackageSchema>>({
    resolver: zodResolver(assignPackageSchema),
    defaultValues: {
      packageId: undefined,
      expiresAt: undefined,
    },
  });

  function handleSubmit(values: z.infer<typeof assignPackageSchema>) {
    if (!hasExpiration) {
      values.expiresAt = null;
    }
    onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="packageId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Package</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value))} 
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a package" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id.toString()}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the package to assign to this user
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="hasExpiration"
            checked={hasExpiration}
            onChange={(e) => setHasExpiration(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label
            htmlFor="hasExpiration"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Set expiration date
          </label>
        </div>
        
        {hasExpiration && (
          <FormField
            control={form.control}
            name="expiresAt"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Expiration Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full pl-3 text-left font-normal"
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  When this package access will expire
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Assign Package
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}