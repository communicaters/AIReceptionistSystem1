import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Package,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  UserRound,
  RefreshCw,
  Key,
  CreditCard,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Infinity,
  DownloadCloud,
  Search,
  FilterX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

// Define package types
interface PackageFeature {
  id: number;
  featureKey: string;
  usageLimit: number | null;
  isEnabled: boolean;
}

interface Package {
  id: number;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  features: PackageFeature[];
}

// API functions
const fetchPackages = async (): Promise<Package[]> => {
  const response = await fetch('/api/packages');
  if (!response.ok) {
    throw new Error('Failed to fetch packages');
  }
  const data = await response.json();
  return data.packages;
};

const createPackage = async (packageData: any) => {
  const response = await apiRequest('POST', '/api/packages', packageData);
  return response.json();
};

const updatePackage = async ({ id, data }: { id: number; data: any }) => {
  const response = await apiRequest('PATCH', `/api/packages/${id}`, data);
  return response.json();
};

const deletePackage = async (id: number) => {
  const response = await apiRequest('DELETE', `/api/packages/${id}`);
  return response.json();
};

const addFeature = async ({ packageId, data }: { packageId: number; data: any }) => {
  const response = await apiRequest('POST', `/api/packages/${packageId}/features`, data);
  return response.json();
};

const updateFeature = async ({ packageId, featureId, data }: { packageId: number; featureId: number; data: any }) => {
  const response = await apiRequest('PATCH', `/api/packages/${packageId}/features/${featureId}`, data);
  return response.json();
};

const deleteFeature = async ({ packageId, featureId }: { packageId: number; featureId: number }) => {
  const response = await apiRequest('DELETE', `/api/packages/${packageId}/features/${featureId}`);
  return response.json();
};

// Validation schemas
const packageFormSchema = z.object({
  name: z.string().min(3, {
    message: "Package name must be at least 3 characters.",
  }),
  description: z.string().optional().nullable(),
  price: z.number().min(0, {
    message: "Price cannot be negative.",
  }),
  isActive: z.boolean().default(true),
});

const packageFeatureSchema = z.object({
  featureKey: z.string().min(3, {
    message: "Feature key must be at least 3 characters.",
  }),
  usageLimit: z.number().nullable().optional(),
  isEnabled: z.boolean().default(true),
});

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount / 100);
};

// Main Packages component
export default function PackagesManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [showEditPackage, setShowEditPackage] = useState(false);
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<PackageFeature | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch packages
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['/api/packages'],
    queryFn: fetchPackages,
  });
  
  // Filter packages by search query
  const filteredPackages = packages.filter(pkg => 
    searchQuery === '' || 
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (pkg.description && pkg.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Create package mutation
  const createPackageMutation = useMutation({
    mutationFn: createPackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({
        title: 'Package created',
        description: 'The package has been created successfully.',
      });
      setShowAddPackage(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create package',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Update package mutation
  const updatePackageMutation = useMutation({
    mutationFn: updatePackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({
        title: 'Package updated',
        description: 'The package has been updated successfully.',
      });
      setShowEditPackage(false);
      setSelectedPackage(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update package',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Delete package mutation
  const deletePackageMutation = useMutation({
    mutationFn: deletePackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({
        title: 'Package deleted',
        description: 'The package has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete package',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Add feature mutation
  const addFeatureMutation = useMutation({
    mutationFn: addFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({
        title: 'Feature added',
        description: 'The feature has been added to the package.',
      });
      setShowAddFeature(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to add feature',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Handle delete confirmation
  const confirmDeletePackage = (pkg: Package) => {
    if (window.confirm(`Are you sure you want to delete the "${pkg.name}" package?`)) {
      deletePackageMutation.mutate(pkg.id);
    }
  };
  
  // Handle package feature deletion
  const confirmDeleteFeature = (packageId: number, featureId: number, featureName: string) => {
    if (window.confirm(`Are you sure you want to remove the "${featureName}" feature?`)) {
      deleteFeatureMutation.mutate({ packageId, featureId });
    }
  };
  
  // Delete feature mutation
  const deleteFeatureMutation = useMutation({
    mutationFn: deleteFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({
        title: 'Feature removed',
        description: 'The feature has been removed from the package.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to remove feature',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
  
  return (
    <>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Package Management</h1>
            <p className="text-muted-foreground">
              Manage subscription packages and feature permissions
            </p>
          </div>
          
          <Button onClick={() => setShowAddPackage(true)}>
            <Package className="mr-2 h-4 w-4" />
            Create Package
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search packages..." 
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
              <FilterX className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
          <Button variant="outline" size="icon">
            <DownloadCloud className="h-4 w-4" />
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPackages.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No Packages Found</CardTitle>
            <CardDescription className="text-center mb-6">
              {searchQuery 
                ? "No packages match your search query. Try a different search term."
                : "You haven't created any packages yet. Create your first package to get started."}
            </CardDescription>
            <Button onClick={() => setShowAddPackage(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Package
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPackages.map((pkg) => (
              <PackageCard 
                key={pkg.id} 
                pkg={pkg} 
                onEdit={() => {
                  setSelectedPackage(pkg);
                  setShowEditPackage(true);
                }}
                onDelete={() => confirmDeletePackage(pkg)}
                onAddFeature={() => {
                  setSelectedPackage(pkg);
                  setShowAddFeature(true);
                }}
                onDeleteFeature={(featureId, featureName) => 
                  confirmDeleteFeature(pkg.id, featureId, featureName)
                }
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Add Package Dialog */}
      <Dialog open={showAddPackage} onOpenChange={setShowAddPackage}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Package</DialogTitle>
            <DialogDescription>
              Add a new subscription package with features and permissions.
            </DialogDescription>
          </DialogHeader>
          
          <PackageForm 
            onSubmit={(data) => createPackageMutation.mutate(data)} 
            isLoading={createPackageMutation.isPending}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Package Dialog */}
      <Dialog open={showEditPackage} onOpenChange={setShowEditPackage}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Package</DialogTitle>
            <DialogDescription>
              Update package details and status.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPackage && (
            <PackageForm 
              pkg={selectedPackage}
              onSubmit={(data) => updatePackageMutation.mutate({ id: selectedPackage.id, data })} 
              isLoading={updatePackageMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Add Feature Dialog */}
      <Dialog open={showAddFeature} onOpenChange={setShowAddFeature}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Feature to Package</DialogTitle>
            <DialogDescription>
              {selectedPackage && `Add a feature to the "${selectedPackage.name}" package.`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPackage && (
            <FeatureForm 
              onSubmit={(data) => addFeatureMutation.mutate({ 
                packageId: selectedPackage.id, 
                data 
              })} 
              isLoading={addFeatureMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Package Card Component
function PackageCard({ 
  pkg, 
  onEdit, 
  onDelete, 
  onAddFeature, 
  onDeleteFeature 
}: { 
  pkg: Package; 
  onEdit: () => void; 
  onDelete: () => void; 
  onAddFeature: () => void;
  onDeleteFeature: (featureId: number, featureName: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="relative pb-2">
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Package
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddFeature}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Feature
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Package
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <CardTitle className="text-xl">{pkg.name}</CardTitle>
        </div>
        <div className="flex items-center justify-between">
          <CardDescription>{pkg.description || "No description"}</CardDescription>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="font-bold text-xl">{formatCurrency(pkg.price)}</div>
          <Badge variant={pkg.isActive ? "default" : "secondary"}>
            {pkg.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="text-sm font-medium mb-2">Included Features:</div>
        
        {pkg.features && pkg.features.length > 0 ? (
          <div className="space-y-2">
            {pkg.features.map((feature) => (
              <div key={feature.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{feature.featureKey}</div>
                    <div className="text-xs text-muted-foreground">
                      {feature.usageLimit === null ? (
                        <span className="flex items-center">
                          <Infinity className="h-3 w-3 mr-1" />
                          Unlimited
                        </span>
                      ) : (
                        <span>Limit: {feature.usageLimit}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {feature.isEnabled ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      <XCircle className="h-3 w-3 mr-1" />
                      Disabled
                    </Badge>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => onDeleteFeature(feature.id, feature.featureKey)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm border rounded-md">
            No features added to this package yet
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2">
        <Button variant="outline" size="sm" className="w-full" onClick={onAddFeature}>
          <Plus className="h-4 w-4 mr-2" />
          Add Feature
        </Button>
      </CardFooter>
    </Card>
  );
}

// Package Form Component
function PackageForm({ 
  pkg, 
  onSubmit, 
  isLoading 
}: { 
  pkg?: Package;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const form = useForm<z.infer<typeof packageFormSchema>>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      name: pkg?.name || "",
      description: pkg?.description || "",
      price: pkg ? pkg.price : 0,
      isActive: pkg ? pkg.isActive : true,
    },
  });

  function handleSubmit(values: z.infer<typeof packageFormSchema>) {
    onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Package Name</FormLabel>
              <FormControl>
                <Input placeholder="Basic Plan" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe what's included in this package" 
                  {...field} 
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (in cents)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={0} 
                  placeholder="1999" 
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>
                Enter the price in cents (e.g., 1999 for $19.99)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Active Status</FormLabel>
                <FormDescription>
                  Make this package available for users
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {pkg ? "Update Package" : "Create Package"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// Feature Form Component
function FeatureForm({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const form = useForm<z.infer<typeof packageFeatureSchema>>({
    resolver: zodResolver(packageFeatureSchema),
    defaultValues: {
      featureKey: "",
      usageLimit: null,
      isEnabled: true,
    },
  });

  function handleSubmit(values: z.infer<typeof packageFeatureSchema>) {
    onSubmit(values);
  }

  const [isUnlimited, setIsUnlimited] = useState(true);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="featureKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Feature Key</FormLabel>
              <FormControl>
                <Input placeholder="email_management" {...field} />
              </FormControl>
              <FormDescription>
                Use a descriptive feature key like "live_chat" or "email_management"
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="unlimited" 
            checked={isUnlimited} 
            onCheckedChange={(checked) => {
              setIsUnlimited(checked as boolean);
              form.setValue("usageLimit", checked ? null : 0);
            }}
          />
          <label
            htmlFor="unlimited"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Unlimited usage
          </label>
        </div>
        
        {!isUnlimited && (
          <FormField
            control={form.control}
            name="usageLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Usage Limit</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={0} 
                    placeholder="100" 
                    {...field}
                    value={field.value === null ? "" : field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>
                  Maximum number of times this feature can be used
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
          name="isEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Enabled</FormLabel>
                <FormDescription>
                  Toggle whether this feature is available
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Add Feature
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}